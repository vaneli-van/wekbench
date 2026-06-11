import { createFileRoute } from "@tanstack/react-router";
import { notFound } from "@tanstack/react-router"

import { orders } from "@/lib/data"
import { getOrderDetail } from "@/lib/order-detail"
import { OrderDetailClient } from "@/components/orders/order-detail-client"

function OrderDetailPage() {
  const { id } = Route.useParams();

  const order = orders.find((o) => o.id === id)
  if (!order) return notFound()

  const detail = getOrderDetail(order)
  return <OrderDetailClient order={order} detail={detail} />
}


export const Route = createFileRoute("/_app/orders/$id")({
  component: OrderDetailPage,
});
