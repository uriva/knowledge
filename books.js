const strip = require('strip');

const { makeCachedFunction } = require('./cache');
const { makeRetryableFunction } = require('./retry');

const doRequest = function(append) {
  const url = `https://www.googleapis.com/books/v1/volumes${append}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }).then(res => res.json());
};

const switchToHttps = httpLink => {
  if (!httpLink) {
    return;
  }
  if (httpLink.startsWith('https')) {
    return httpLink;
  }
  return 'https' + httpLink.substring(4);
};

const getTitle = volInfo => {
  const author =
    volInfo.authors && volInfo.authors.length ? volInfo.authors[0] + ' - ' : '';
  return author + volInfo.title;
};

// https://www.googleapis.com/books/v1/volumes/s1gVAAAAYAAJ
exports.bookInfo = makeCachedFunction(
  makeRetryableFunction(
    id =>
      doRequest('/' + id).then(bookInfo => {
        const volInfo = bookInfo.volumeInfo;
        return {
          id,
          title: getTitle(volInfo),
          category: 'books',
          link: bookInfo.accessInfo.webReaderLink,
          description: strip(volInfo.description),
          bigPictureSource:
            volInfo.imageLinks && switchToHttps(volInfo.imageLinks.medium),
          smallPictureSource:
            volInfo.imageLinks &&
            switchToHttps(volInfo.imageLinks.smallThumbnail),
          locationComplete: true
        };
      }),
    'bookInfo'
  ),
  'bookInfo'
);

// https://www.googleapis.com/books/v1/volumes?q=catcher
exports.searchBook = searchStr =>
  doRequest('?maxResults=6&q=' + searchStr).then(response => {
    if (!response.items) {
      return [];
    }
    return response.items.map(result => {
      const volInfo = result.volumeInfo;
      return {
        id: result.id,
        category: 'books',
        title: getTitle(volInfo),
        description: strip(volInfo.description),
        bigPictureSource:
          volInfo.imageLinks && switchToHttps(volInfo.imageLinks.thumbnail),
        smallPictureSource:
          volInfo.imageLinks && switchToHttps(volInfo.imageLinks.smallThumbnail)
      };
    });
  });
