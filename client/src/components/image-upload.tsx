import { UserUploadedImage } from "types";

import Net from "shared/net";

export default async function uploadImages(
    files: FileList
): Promise<Array<UserUploadedImage>> {
    let counter = 0;
    let formData = new FormData();

    for (let i = 0; i < files.length; i++) {
        let sortedFiles = Array.from(files).sort(
            (a, b) => a.lastModified - b.lastModified
        );
        const file = sortedFiles[i];

        if (file.type.startsWith("image/")) {
            formData.append("file" + counter, file);
            counter += 1;
        }
    }

    if (counter > 0) {
        let options: RequestInit = {
            method: "POST",
            body: formData,
        };

        // post the image data
        let response = await fetch("/api/upload", options);
        if (!response.ok) {
            throw new Error("Network response was not OK");
        }

        let imagesUploaded = await response.json();

        // fetch the most recent uploads or the last 15, whichever is greater
        let recentImages = await Net.get<Array<UserUploadedImage>>(
            `/api/upload/${imagesUploaded}`
        );
        return recentImages;
    }

    return [];
}
