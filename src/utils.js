/* eslint-disable no-console */

const fs = require('fs');

// NOTE:
// I chose the User-Agent value from http://www.browser-info.net/useragents
// Not setting one causes Google search to not display results
const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:34.0) Gecko/20100101 Firefox/34.0';

const defaultLimit = 10;

const getDefaultRequestOptions = (limit, query, userAgent) => ({
  url: 'https://www.google.com/search',
  qs: {
    q: query,
    num: limit || defaultLimit,
  },
  headers: {
    'User-Agent': userAgent || defaultUserAgent,
  },
});

const titleSelector = '#rso > div > div > div > div > div > div.r > a > h3';
const linkSelector = 'div.rc > div.r > a';
const snippetSelector = '#rso > div > div > div > div > div > div.s > div > span';

const logIt = (message, disableConsole) => {
  if (!disableConsole) {
    console.log(message);
  }
};

const saveToFile = (output, results) => {
  if (output !== undefined) {
    fs.writeFile(output, JSON.stringify(results, null, 2), 'utf8', (err) => {
      if (err) {
        console.err(`Error writing to file ${output}: ${err}`);
      }
    });
  }
};

const saveResponse = (response, htmlFileOutputPath) => {
  if (htmlFileOutputPath) {
    fs.writeFile(htmlFileOutputPath, response.body, () => {
      console.log(`Html file saved to ${htmlFileOutputPath}`);
    });
  }
};

module.exports = {
  defaultUserAgent,
  defaultLimit,
  getDefaultRequestOptions,
  titleSelector,
  linkSelector,
  snippetSelector,
  logIt,
  saveToFile,
  saveResponse,
};
