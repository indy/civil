const Net = {
    get: (url) => go("GET", url),
    getThenDispatch: (url, dispatch, actionType) => {
        return go("GET", url).then(data => {
            dispatch({
                type: actionType,
                data
            })
        })
    },
    put: (url, data) => go("PUT", url, data),
    post: (url, data) => go("POST", url, data),
    postThenDispatch: (url, postData, dispatch, actionType) => {
        return go("POST", url, postData).then(data => {
            dispatch({
                type: actionType,
                data
            })
        })
    },
    delete: (url, data) => go("DELETE", url, data),
    // use getCORS when you're not allowed to set 'content-type'
    getCORS: url => fetch(url).then(response => response.json())
};

function go(method, url, data) {
    let options = {
        method,
        headers: {
            'content-type': 'application/json'
        }
    };
    if (data) {
        options.body = JSON.stringify(data);
    }

    return fetch(url, options).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not OK');
        }
        return response.json();
    });
}


export default Net;
