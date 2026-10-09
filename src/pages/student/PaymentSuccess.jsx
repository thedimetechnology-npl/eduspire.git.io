import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyPayment } from "../../api/payment";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function verify() {
      try {
        const orderId = searchParams.get("order_id");

        if (!orderId) {
          alert("Order ID not found.");
          return;
        }

        await verifyPayment(orderId);

        alert("Payment verified successfully!");

        navigate("/student/my-courses");
      } catch (err) {
        console.error(err);
        alert("Payment verification failed.");
      }
    }

    verify();
  }, [navigate, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen">
      <h2 className="text-2xl font-bold">
        Verifying your payment...
      </h2>
    </div>
  );
}