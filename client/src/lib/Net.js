const Net = {
  get: (url) => go("GET", url),
  put: (url, data) => go("PUT", url, data),
  post: (url, data) => go("POST", url, data),
  delete: (url, data) => go("DELETE", url, data)
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

  return fetch(url, options).then(response => response.json());
}


export default Net;
