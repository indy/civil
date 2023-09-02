const Net = {
    get: async function <TResp>(url: string): Promise<TResp> {
        return go<void, TResp>("GET", url);
    },
    put: async function <TData, TResp>(
        url: string,
        data: TData
    ): Promise<TResp> {
        return go<TData, TResp>("PUT", url, data);
    },
    post: async function <TData, TResp>(
        url: string,
        data: TData
    ): Promise<TResp> {
        return go<TData, TResp>("POST", url, data);
    },
    delete: async function <TData, TResp>(
        url: string,
        data: TData
    ): Promise<TResp> {
        return go<TData, TResp>("DELETE", url, data);
    },
    // use getCORS when you're not allowed to set 'content-type'
    getCORS: async function <TResp>(url: string): Promise<TResp> {
        return fetch(url).then((response) => response.json());
    },
    getTimed: async function <TResp>(url: string): Promise<[TResp, number]> {
        let before = Date.now();
        let response = await go<void, TResp>("GET", url);
        let after = Date.now();

        return [response, after - before];
    },
};

async function go<TData, TResp>(
    method: string,
    url: string,
    data?: TData
): Promise<TResp> {
    let options: RequestInit = {
        method,
        headers: {
            "content-type": "application/json",
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    let response = await fetch(url, options);
    if (!response.ok) {
        throw new Error("Network response was not OK");
    }

    let ret = await response.json();

    return ret as TResp;
}

export default Net;
