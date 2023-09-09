type YouTubeProps = {
    id?: string;
    start?: string;
};

export default function YouTube({ id, start }: YouTubeProps) {
    let src = `https://www.youtube.com/embed/${id}`;

    if (start) {
        src += `?start=${start}`;
    }

    return (
        <iframe
            src={src}
            width="560"
            height="315"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        ></iframe>
    );
}
