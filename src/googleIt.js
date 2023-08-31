/* eslint-disable no-console */
/* eslint-disable array-callback-return */
const request = require('request');
const fs = require('fs');
const { URL } = require('url');
const querystring = require('querystring');
const cheerio = require('cheerio');
require('colors');
const { exec } = require('child_process');
const {
  getDefaultRequestOptions,
  getTitleSelector,
  getLinkSelector,
  getSnippetSelector,
  getResultStatsSelector,
  getResultCursorSelector,
  logIt,
  saveToFile,
  saveResponse,
  titlefinder
} = require('./utils');

function stripTags(input) {
  return input.replace(/<\/?[^>]+(>|$)/g, "").replaceAll('&nbsp;', '');
}

const errorTryingToOpen = (error, stdout, stderr) => {
  if (error) {
    console.log(`Error trying to open link in browser: ${error}`);
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  }
}

const openInBrowser = (open, results) => {
  if (open !== undefined) {
    // open is the first X number of links to open
    results.slice(0, open).forEach((result) => {
      exec(`open ${result.link}`, errorTryingToOpen);
    });
  }
}

const getSnippet = (elem) => {
  // recursive function to get "all" the returned data from Google
  function findData(child) {
    if (child.name == 'span' && child.attribs['class'] && child.attribs['class'].includes('rQMQod')) return '';
    if (!child.data) {
      return child.children.map((c) => c.data || findData(c));
    }
    return child.data;
  }

  

  // Issue with linter wanting "new" before "Array"
  // in this case, the casting is legit, we don't want a new array
  // eslint-disable-next-line unicorn/new-for-builtins
  return elem.children && elem.children.length > 0 ? elem.children.map((child) => Array(findData(child)).join('')).join('').replace(/(^[,\s]+)|([,\s]+$)/g, '') : '';
}

const getTimeSnippet = (elem) => {
  // recursive function to get "all" the returned data from Google
  function findData(child) {
    //if (child.name == 'div' || !child.children) return '';
    if (!child.data) {
      return child.children.map((c) => c.data || findData(c));
    }
    return child.data;
  }

  
  
  // Issue with linter wanting "new" before "Array"
  // in this case, the casting is legit, we don't want a new array
  // eslint-disable-next-line unicorn/new-for-builtins
  return elem.children && elem.children.length > 0 ? elem.children.map((child) => Array(findData(child)).join('')).join('') : '';
}

const display = (results, disableConsole, onlyUrls) => {
  logIt('\n', disableConsole);
  results.forEach((result) => {
    if (onlyUrls) {
      logIt(result.link.green, disableConsole);
    } else if (result.title) {
      logIt(result.title.blue, disableConsole);
      logIt(result.link.green, disableConsole);
      logIt(result.snippet, disableConsole);
      logIt('\n', disableConsole);
    } else {
      logIt('Result title is undefined.');
    }
  });
}

const parseGoogleSearchResultUrl = (url) => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('http://www.google.com/url?')) {
    const urlObject = new URL(url);
    const queryObject = querystring.parse(urlObject.search.substr(1));
    return queryObject.url;
  }
  if (url.charAt(0) === '/') {
    return querystring.parse(url).url;
  }
  return url;
};

const getResults = ({
  data,
  noDisplay,
  disableConsole,
  onlyUrls,
  titleSelector,
  linkSelector,
  snippetSelector,
  resultStatsSelector,
  cursorSelector,
}) => {
  const $ = cheerio.load(data);
  let results = [];

  const titles = $(getTitleSelector(titleSelector)).find(titlefinder);

  titles.each((index, elem) => {
    if (elem.children[0].data) {
      results.push({ title: elem.children[0].data });
    } else {
      results.push({ title: elem.children[0].data });
    }
  });

  $(getLinkSelector(linkSelector)).map((index, elem) => {
    if (index < results.length) {
      results[index] = Object.assign(results[index], {
        link: parseGoogleSearchResultUrl(elem.attribs.href),
      });
    }
  });
  let fs = require('fs')
  
  //console.log('snippet selector', getSnippetSelector(snippetSelector))
  $(getSnippetSelector(snippetSelector)).map((index, elem) => {
    //fs.writeFileSync('snippet'+Math.random()+'.html', cheerio.load(elem).html());
    let $snippet = cheerio.load(elem)

    if (index < results.length) {
      results[index] = Object.assign(results[index], {
        snippet: getSnippet(elem),
      });

      if ($snippet('.v9i61e').length) {
        //console.log('html1', $snippet('.v9i61e').html(), 'text1', $snippet('.v9i61e').text());
        results[index] = Object.assign(results[index], {
          metaHtml: $snippet('.v9i61e').html(),
        });
        // search for links in next sibling div
        let linksContainer = $snippet('.v9i61e').next();
        let links = linksContainer.find('a');
        if (links.length) {
          // rewrite snippet with clean version without link ugly text
          //console.log(`snippet `, $snippet('.v9i61e').text());
          // for some magical reason $snippet('.v9i61e').text() returns more text than .html() 
          results[index].snippet = stripTags(results[index].metaHtml);
          delete results[index].metaHtml;
          

          results[index] = Object.assign(results[index], {
            pages: links.map((i, el) => {
              return {
                link: parseGoogleSearchResultUrl(el.attribs.href),
                text: $(el).text()
              }
            }).toArray()
          });
        }




        let rating = $snippet('.oqSTJd')
        if (rating.length) {
          Object.assign(results[index], {
            rating: rating.text()
          });
          
        }
        let votes = $snippet('.Eq0J8:last-child')
        if (votes.length) {
          Object.assign(results[index], {
            votesCount: votes.text().replace(/\D+/g, '')
          });
        }
      }

      let $timeSnippet = $snippet('div:not(.v9i61e) > div > span.rQMQod:nth-child(1)')
      if ($timeSnippet.length && /\d/.test($timeSnippet.html())) {
        results[index] = Object.assign(results[index], {
          timeSnippet: $timeSnippet.html(),
        });

        //if (results[index].timeSnippet == 'Premier League') {
        //  console.error('err', $snippet.html());
        //  fs.writeFileSync('err_snippet'+Math.random()+'.html', $snippet.html());
        //}
      }

    }
  });


  if (onlyUrls) {
    results = results.map((r) => ({ link: r.link }));
  }
  if (!noDisplay) {
    display(results, disableConsole, onlyUrls);
  }

  const resultStats = $(getResultStatsSelector(resultStatsSelector)).html() || '';
  const approximateResults = ((resultStats.split(' results') || [''])[0].split('About ')[1] || '').replace(',', '');
  const seconds = parseFloat((resultStats.split(' (')[1] || '').split(' seconds')[0]);
  const cursor = $(getResultCursorSelector(cursorSelector)).html() || '';
  const page = parseInt(cursor.split('</span>')[1], 10);
  const stats = {
    page,
    approximateResults,
    seconds,
  };
  return { results, stats };
}

const getResponse = ({
  fromFile: filePath,
  fromString,
  options,
  htmlFileOutputPath,
  query,
  limit,
  userAgent,
  start,
  includeSites,
  excludeSites,
}) => {
  // eslint-disable-next-line consistent-return
  return new Promise((resolve, reject) => {
    if (filePath) {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          return reject(new Error(`Erorr accessing file at ${filePath}: ${err}`));
        }
        return resolve({ body: data });
      });
    } else if (fromString) {
      return resolve({ body: fromString });
    }
    const defaultOptions = getDefaultRequestOptions({
      limit, query, userAgent, start, includeSites, excludeSites,
    });
    
    let abortController
    let reqInstance = request({ ...defaultOptions, ...options }, (error, response, body) => {
      if (error) {
        return reject(new Error(`Error making web request: ${error}`));
      }
      saveResponse(response, htmlFileOutputPath);

      if (abortController) {
        clearTimeout(abortController)
      }
      return resolve({ body, response });
    });

    abortController = setTimeout(() => {
      console.log('aborting req!')
      reqInstance.abort()
      return reject(new Error(`Timeout making web request`))
    }, options && options.timeout ? options.timeout : 15000)
  });
}

const googleIt = (config) => {
  const {
    output,
    open,
    returnHtmlBody,
    titleSelector,
    linkSelector,
    snippetSelector,
    resultStatsSelector,
    cursorSelector,
    start,
    diagnostics,
  } = config;
  return new Promise((resolve, reject) => {
    getResponse(config).then(({ body, response }) => {

      if (body.includes('if(solveSimpleChallenge) {solveSimpleChalle')) {
        return reject(new Error(`captcha detected`));
      }

      //let path = `body${new Date}.html`;

      //console.log('writing data to fs: ' + path);
      //fs.writeFileSync(path, body);

      const { results, stats } = getResults({
        data: body,
        noDisplay: config['no-display'],
        disableConsole: config.disableConsole,
        onlyUrls: config['only-urls'],
        titleSelector,
        linkSelector,
        snippetSelector,
        resultStatsSelector,
        cursorSelector,
        start,
      });
      const { statusCode } = response;
      if (results.length === 0 && statusCode !== 200 && !diagnostics) {
        reject(new Error(`Error in response: statusCode ${statusCode}. To see the raw response object, please include the 'diagnostics: true' as part of the options object (or -d if using command line)`));
      }
      saveToFile(output, results);
      openInBrowser(open, results);
      if (returnHtmlBody || diagnostics) {
        return resolve({
          results, body, response, stats,
        });
      }
      return resolve(results);
    }).catch(reject);
  });
}

module.exports = googleIt;
