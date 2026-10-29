export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  old_price: number | null;
};

export type VariantProduct = {
  id: string;
  unit: string;
  price: number;
  old_price?: number | null;
  variants?: ProductVariant[] | null;
};

export function productCartKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function splitProductCartKey(key: string): { productId: string; variantId: string | null } {
  const separatorIndex = key.indexOf("::");
  if (separatorIndex < 0) return { productId: key, variantId: null };
  return {
    productId: key.slice(0, separatorIndex),
    variantId: key.slice(separatorIndex + 2) || null,
  };
}

export function findProductForCartKey<T extends { id: string }>(products: T[], cartKey: string): T | undefined {
  const { productId } = splitProductCartKey(cartKey);
  return products.find((product) => product.id === productId);
}

export function resolveProductCartLine(product: VariantProduct, cartKey: string) {
  const { productId, variantId } = splitProductCartKey(cartKey);
  const variant = variantId ? product.variants?.find((item) => item.id === variantId) ?? null : null;
  const isValid = !variantId || !!variant;

  return {
    productId,
    variantId,
    variant,
    isValid,
    unit: variant?.label ?? (isValid ? product.unit : "পণ্যের variant পাওয়া যায়নি"),
    price: isValid ? Number(variant?.price ?? product.price) : null,
    oldPrice: isValid ? (variant ? variant.old_price : product.old_price ?? null) : null,
  };
}
