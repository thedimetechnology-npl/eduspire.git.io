import client from "./client";

/**
 * Create a payment order
 */
export const createPayment = async (payload) => {
  const { data } = await client.post("/payments/create", payload);
  return data;
};

/**
 * Get payment by ID
 */
export const getPayment = async (paymentId) => {
  const { data } = await client.get(`/payments/${paymentId}`);
  return data;
};

/**
 * Get logged-in user's payment history
 */
export const getPaymentHistory = async () => {
  const { data } = await client.get("/payments/history");
  return data;
};

/**
 * Verify payment status
 */
export const verifyPayment = async (orderId) => {
  const { data } = await client.post("/payments/verify", {
    order_id: orderId,
  });
  return data;
};

/**
 * Cancel payment
 */
export const cancelPayment = async (paymentId) => {
  const { data } = await client.post(`/payments/${paymentId}/cancel`);
  return data;
};