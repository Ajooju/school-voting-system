"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerFormSchema, customerIdSchema } from "@/lib/validations/customer";

type CustomerActionResult = {
  error?: string;
  success?: string;
};

async function requireAuthenticatedOwner() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage customers.");
  }
}

export async function createCustomer(input: unknown): Promise<CustomerActionResult> {
  await requireAuthenticatedOwner();

  const parsed = customerFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  await prisma.customer.create({
    data: parsed.data,
  });
  revalidatePath("/customers");

  return { success: "Customer created." };
}

export async function updateCustomer(id: string, input: unknown): Promise<CustomerActionResult> {
  await requireAuthenticatedOwner();

  const parsedId = customerIdSchema.safeParse({ id });

  if (!parsedId.success) {
    return { error: parsedId.error.issues[0]?.message ?? "Invalid customer ID." };
  }

  const parsed = customerFormSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid customer details." };
  }

  await prisma.customer.update({
    where: {
      id: parsedId.data.id,
    },
    data: parsed.data,
  });
  revalidatePath("/customers");

  return { success: "Customer updated." };
}

export async function deleteCustomer(formData: FormData) {
  await requireAuthenticatedOwner();

  const { id } = customerIdSchema.parse({
    id: formData.get("id"),
  });
  const customer = await prisma.customer.findUnique({
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

  if (!customer) {
    return;
  }

  if (customer._count.invoices > 0 || customer._count.quotations > 0) {
    throw new Error("Customers can only be deleted when they are not used by invoices or quotations.");
  }

  await prisma.customer.delete({
    where: {
      id,
    },
  });
  revalidatePath("/customers");
}
