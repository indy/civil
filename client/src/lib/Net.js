
// todo: function to generate object with headers...'application/json' etc

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
    }).then(obj => {
      component.setState({ redirectUrl: `${resourceName}/${obj.id}` });
    });
  },

  createThenRedirectHook: (redirectHook, resourceName, data) => {
    fetch(`/api/${resourceName}`, {
      method: "POST",
      body: data,
      headers: {
        'content-type': 'application/json'
      },
    }).then(res => {
      return res.json();
    }).then(obj => {
      redirectHook(`${resourceName}/${obj.id}`);
    });
  },

  get: url => {
    return fetch(url).then(response => response.json());
  },

  put: (url, data) => {
    let options = {
      method: "PUT",
      headers: {
        'content-type': 'application/json'
      }
    };
    if (data) {
      options.body = JSON.stringify(data);
    }

    return fetch(url, options).then(response => response.json());
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

  delete: (url) => {
    let options = {
      method: "DELETE",
    };

    return fetch(url, options).then(response => response.json());
  }
};

export default Net;
