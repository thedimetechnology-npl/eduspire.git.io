import { load } from "@cashfreepayments/cashfree-js";


let cashfree = null;

/**
 * Initialize Cashfree SDK
 */
export const initializeCashfree = async () => {
  if (!cashfree) {
    cashfree = await load({
      mode: import.meta.env.VITE_CASHFREE_MODE || "sandbox",
    });
  }

  return cashfree;
};

/**
 * Open Cashfree Checkout
 *
 * @param {string} paymentSessionId
 * @param {Function} onSuccess
 */
export const openCashfreeCheckout = async (
  paymentSessionId,
  onSuccess = null
) => {
  try {
    const cf = await initializeCashfree();

    const checkoutOptions = {
      paymentSessionId,

      redirectTarget: "_self",
    };

    const result = await cf.checkout(checkoutOptions);

    console.log("Cashfree Checkout Result:", result);

    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    console.error("Cashfree Checkout Error:", error);
    throw error;
  }
};