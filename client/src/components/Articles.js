import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import Net from '../lib/Net';

class Articles extends Component {
  constructor(props) {
    super(props);

    this.state = {
      articles: [],
      showAddArticleLink: false
    };

    Net.get('/api/articles').then(articles => {
      this.setState({ articles });
    });
  }

  createArticleListing = (article) => {
    return <ArticleListing id={ article.id } key={ article.id } title={ article.title }/>;
  }

  toggleShowAdd = () => {
    this.setState((prevState, props) => ({
      showAddArticleLink: !prevState.showAddArticleLink
    }));
  }

  render() {
    const { articles } = this.state;
    const articlesList = articles.map(this.createArticleListing);

    return (
      <div>
        <h1 onClick={ this.toggleShowAdd }>Articles</h1>
        { this.state.showAddArticleLink && <Link to='/add-article'>Add Article</Link> }
        <ul>
          { articlesList }
        </ul>
      </div>
    );
  }
}

const ArticleListing = props => {
  const href = `/articles/${props.id}`;
  return (<li><Link to={ href }>{ props.title }</Link></li>);
};

export default Articles;
