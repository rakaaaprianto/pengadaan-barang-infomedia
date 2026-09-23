import type { Metadata } from "next";
import { TrackingView } from "@/components/TrackingView";

export const metadata: Metadata = {
  title: "Labeling & Distribusi Asset | Facility & Asset Management",
  description:
    "Monitoring alur sub proses labeling barcode fisik dan pendistribusian pengiriman barang ke user pemakai unit kerja PT Infomedia Nusantara.",
};

export default function TrackingPage() {
  return <TrackingView />;
}
