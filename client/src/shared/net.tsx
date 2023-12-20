const Net = {
    get: async function <TResp>(url: string): Promise<TResp> {
        return go<TResp>(url, request("GET"));
    },
    put: async function <TData, TResp>(
        url: string,
        data: TData,
    ): Promise<TResp> {
        return go<TResp>(url, addData<TData>(request("PUT"), data));
    },
    post: async function <TData, TResp>(
        url: string,
        data: TData,
    ): Promise<TResp> {
        return go<TResp>(url, addData<TData>(request("POST"), data));
    },
    delete: async function <TData, TResp>(
        url: string,
        data: TData,
    ): Promise<TResp> {
        return go<TResp>(url, addData<TData>(request("DELETE"), data));
    },
    getAbortable: async function <TResp>(
        url: string,
        signal: AbortSignal,
    ): Promise<TResp> {
        return go<TResp>(url, addSignal(request("GET"), signal));
    },
    // use getCORS when you're not allowed to set 'content-type'
    getCORS: async function <TResp>(url: string): Promise<TResp> {
        return fetch(url).then((response) => response.json());
    },
    getTimed: async function <TResp>(url: string): Promise<[TResp, number]> {
        let before = Date.now();
        let response = await go<TResp>(url, request("GET"));
        let after = Date.now();

        return [response, after - before];
    },
};

function request(method: string): RequestInit {
    let options: RequestInit = {
        method,
        headers: {
            "content-type": "application/json",
        },
    };

    return options;
}

function addData<TData>(options: RequestInit, data: TData): RequestInit {
    options.body = JSON.stringify(data);
    return options;
}

function addSignal(options: RequestInit, signal: AbortSignal): RequestInit {
    options.signal = signal;
    return options;
}

async function go<TResp>(url: string, options: RequestInit): Promise<TResp> {
    let response = await fetch(url, options);
    if (!response.ok) {
        throw new Error("Network response was not OK");
    }

    let ret = await response.json();

    return ret as TResp;
}

export default Net;
