import Paginator from "./paginator";
import RecentlyVisited from "./recently-visited";
import SegmentInsignias from "./segment-insignias";

export default function FrontPage({ path }: { path?: string }) {
    return (
        <div>
            <Paginator />
            <RecentlyVisited numRecent={30} />
            <SegmentInsignias />
        </div>
    );
}
