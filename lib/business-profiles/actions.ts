"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadBusinessLogo, removeBusinessLogo } from "@/lib/business-profiles/logo-upload";
import {
  businessProfileFormSchema,
  businessProfileIdSchema,
} from "@/lib/validations/business-profile";

async function requireAuthenticatedOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage business profiles.");
  }
}

function getBusinessProfileFormData(formData: FormData) {
  return businessProfileFormSchema.parse({
    businessName: formData.get("businessName"),
    defaultCurrencyCode: formData.get("defaultCurrencyCode"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    taxNumber: formData.get("taxNumber"),
    notes: formData.get("notes"),
  });
}

function getLogoFile(formData: FormData) {
  const logo = formData.get("logo");

  if (logo instanceof File && logo.size > 0) {
    return logo;
  }

  return null;
}

export async function createBusinessProfile(formData: FormData) {
  await requireAuthenticatedOwner();

  const values = getBusinessProfileFormData(formData);
  const logoFile = getLogoFile(formData);
  const businessProfile = await prisma.businessProfile.create({
    data: values,
  });

  if (logoFile) {
    const logoFileUrl = await uploadBusinessLogo(businessProfile.id, logoFile);

    await prisma.businessProfile.update({
      where: {
        id: businessProfile.id,
      },
      data: {
        logoFileUrl,
      },
    });
  }

  revalidatePath("/businesses");
}

export async function updateBusinessProfile(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = businessProfileIdSchema.parse({
    id: formData.get("id"),
  });
  const values = getBusinessProfileFormData(formData);
  const logoFile = getLogoFile(formData);
  const existingProfile = logoFile
    ? await prisma.businessProfile.findUnique({
        where: {
          id,
        },
        select: {
          logoFileUrl: true,
        },
      })
    : null;
  const logoFileUrl = logoFile ? await uploadBusinessLogo(id, logoFile) : undefined;

  await prisma.businessProfile.update({
    where: {
      id,
    },
    data: {
      ...values,
      ...(logoFileUrl ? { logoFileUrl } : {}),
    },
  });

  if (logoFileUrl && existingProfile?.logoFileUrl && existingProfile.logoFileUrl !== logoFileUrl) {
    await removeBusinessLogo(existingProfile.logoFileUrl);
  }

  revalidatePath("/businesses");
}

export async function deleteBusinessProfile(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = businessProfileIdSchema.parse({
    id: formData.get("id"),
  });
  const businessProfile = await prisma.businessProfile.findUnique({
    where: {
      id,
    },
    include: {
      _count: {
        select: {
          invoices: true,
          quotations: true,
        },
      },
    },
  });

  if (!businessProfile) {
    return;
  }

  if (businessProfile._count.invoices > 0 || businessProfile._count.quotations > 0) {
    throw new Error("Business profiles can only be deleted when they are not used by invoices or quotations.");
  }

  await prisma.businessProfile.delete({
    where: {
      id,
    },
  });
  await removeBusinessLogo(businessProfile.logoFileUrl);

  revalidatePath("/businesses");
}
