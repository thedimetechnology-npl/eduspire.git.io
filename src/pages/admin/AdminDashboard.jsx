import { useEffect, useState } from "react";
import { Users, BookOpen, DollarSign } from "lucide-react";
import client from "../../api/client";
import { StatCard } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Kit";
import { ChartCard } from "../../components/charts/ChartCard";
import { formatCurrency } from "../../utils/helpers";

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    client.get("/dashboard/admin").then(({ data }) => setData(data)).catch(() => setData(null));
  }, []);

  if (!data) return <Spinner />;

  return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Students" value={data.total_students} accent="ink" />
        <StatCard icon={Users} label="Teachers" value={data.total_teachers} accent="gold" />
        <StatCard icon={BookOpen} label="Courses" value={`${data.published_courses}/${data.total_courses}`} trend="published/total" accent="emerald" />
        <StatCard icon={DollarSign} label="Total revenue" value={formatCurrency(data.total_revenue)} accent="ink" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Revenue by month" type="line" data={data.revenue_by_month} color="#2F8F6E" />
        <ChartCard title="Student signups by month" type="line" data={data.signups_by_month} color="#C9974A" />
      </div>

      <ChartCard title="Top courses by enrollment" data={data.top_courses} />
  );
}
