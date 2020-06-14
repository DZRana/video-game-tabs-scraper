const puppeteer = require("puppeteer");
const fs = require("fs");
const cheerio = require("cheerio");
const fetch = require("node-fetch");

getPageNumbers = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://www.gametabs.net/all-tabs?order=name&sort=asc&instrument=All&style=All&tuning=All"
  );
  let numPages = [];
  numPages.push(
    await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(
          "#content-area > div > div.item-list > ul > li.pager-last.last > a"
        )
      ).map((a) => ({
        pages: a.href,
      }))
    )
  );

  await browser.close();

  return (
    parseInt(
      numPages[0][0].pages.substring(
        numPages[0][0].pages.indexOf("=") + 1,
        numPages[0][0].pages.indexOf("&")
      )
    ) + 1
  );
};

getGames = async (pages) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://www.gametabs.net/all-tabs?order=name&sort=asc&instrument=All&style=All&tuning=All"
  );
  let gamesArr = [];
  for (let i = 0; i < pages; i++) {
    if (i !== pages - 1) {
      await Promise.all([
        page.waitForNavigation(),
        gamesArr.push(
          await page.evaluate(() =>
            Array.from(
              document.querySelectorAll(
                "td.views-field.views-field-name.active > a"
              )
            ).map((a) => ({
              game: a.textContent,
              game_url: a.href,
            }))
          )
        ),
        page.click(
          "#content-area > div > div.item-list > ul > li.pager-next > a"
        ),
      ]);
    } else {
      gamesArr.push(
        await page.evaluate(() =>
          Array.from(
            document.querySelectorAll(
              "td.views-field.views-field-name.active > a"
            )
          ).map((a) => ({
            game: a.textContent,
            game_url: a.href,
          }))
        )
      );
    }
  }

  await browser.close();

  return gamesArr.reduce((prev, curr) => prev.concat(curr));
};

getSongs = async (pages) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(
    "https://www.gametabs.net/all-tabs?order=name&sort=asc&instrument=All&style=All&tuning=All"
  );
  let songsArr = [];
  for (let i = 0; i < pages; i++) {
    if (i !== pages - 1) {
      await Promise.all([
        page.waitForNavigation(),
        songsArr.push(
          await page.evaluate(() =>
            Array.from(
              document.querySelectorAll("td.views-field.views-field-title > a")
            ).map((a) => ({
              song: a.textContent,
              tab_url: a.href,
            }))
          )
        ),
        page.click(
          "#content-area > div > div.item-list > ul > li.pager-next > a"
        ),
      ]);
    } else {
      await Promise.all([
        songsArr.push(
          await page.evaluate(() =>
            Array.from(
              document.querySelectorAll("td.views-field.views-field-title > a")
            ).map((a) => ({
              song: a.textContent,
              tab_url: a.href,
            }))
          )
        ),
      ]);
    }
  }

  await browser.close();

  return songsArr.reduce((prev, curr) => prev.concat(curr));
};

getSheet = async (tab_url) => {
  try {
    let res = await fetch(tab_url);
    let text = await res.text();
    const $ = cheerio.load(text);
    return $("#content-area > div.content.clearfix").text();
  } catch (err) {
    console.log(err);
  }
};

getRating = async (tab_url) => {
  try {
    let res = await fetch(tab_url);
    let text = await res.text();
    const $ = cheerio.load(text);
    if ($("span.average-rating > span").text()) {
      return `${$("span.average-rating > span").text()}/5`;
    }
    return "Unrated";
  } catch (err) {
    console.log(err);
  }
};

buildTabs = async () => {
  let pages = await getPageNumbers();
  let gamesArr = await getGames(pages);
  let songsArr = await getSongs(pages);
  let tabs = [];

  for (let i = 0; i < gamesArr.length; i++) {
    gamesArr[i] = {
      ...gamesArr[i],
      song: songsArr[i].song,
      tab_url: songsArr[i].tab_url,
      rating: await getRating(songsArr[i].tab_url),
      sheet: await getSheet(songsArr[i].tab_url),
    };
  }

  tabs = gamesArr;

  fs.writeFile("./json/tabs.json", JSON.stringify(tabs, null, 2), (err) =>
    err
      ? console.log("Writing file failed.", err)
      : console.log("File written successfully.")
  );
};

buildTabs();
