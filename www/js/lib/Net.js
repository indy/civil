const Net = {
  get: (url) => go("GET", url),
  put: (url, data) => go("PUT", url, data),
  post: (url, data) => go("POST", url, data),
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

  return fetch(url, options).then(response => response.json());
}


export default Net;
