import dynamic from "next/dynamic";

const ActivityMap = dynamic(() => import("./ActivityMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] bg-slate-100 rounded-xl animate-pulse" />
  ),
});

export default ActivityMap;
