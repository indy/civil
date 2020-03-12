const Net = {

  createThenRedirect: (component, resourceName, data) => {
    fetch(`/api/${resourceName}`, {
      method: "POST",
      body: data,
      headers: {
        'content-type': 'application/json'
      },
    }).then(res => {
      return res.json();
    }).then(id => {
      component.setState({ redirectUrl: `${resourceName}/${id}` });
    });
  },

  post: (url, data) => {
    let options = {
      method: "POST",
      headers: {
        'content-type': 'application/json'
      }
    };
    if (data) {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options).then(response => response.json());
  },

  get: url => {
    return fetch(url).then(response => response.json());
  }
};

export default Net;
