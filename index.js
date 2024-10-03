const cheerio = require("cheerio");
const axios =  require("axios");
const fs = require("fs");
const xlsx = require('xlsx');

// constants for input/output
const URL = "https://www.infoconcert.com/festival/midem-festival-2260/concerts.html?menu=archives&annee_archives=2024";
const URLBase = "http://www.infoconcert.com";
const JSONOutput = './midem.json';
const XLSXOutput = './midem.xlsx';


async function performScraping() {

    // HTTP GET Request
    const response = await axios.request({
        method: "GET",
        url: `${URL}`,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
        }
    });

    const pageData = cheerio.load(response.data);


    // CONCERTS Scraping

    const dataConcerts = [];

    const concerts = pageData(".panel-body");
    concerts.each((index, concert) => {
        const data = pageData(concert);

        const dt = data.find(".date").find("time");
        const date_time = dt.attr("datetime");

        if (date_time === undefined) return; // in case of other ".panel-body" section

        const date = date_time.split('T')[0];
        const time = date_time.split('T')[1];


        const day_title = dt.find(".day-title").text().trim();
        const day = dt.find(".day").text().trim();
        const month = dt.find(".month").text().trim();
        const year = dt.find(".year").text().trim();
        const hour = dt.find(".hour").text().trim();

        const fullDateTime = "le "+day_title+" "+day+" "+month+" "+year+" a "+ hour;


        const spectacles = data.find(".spectacle").find("a");

        const listSpectacles = [];
        spectacles.each((index, spectacle) => {
            const spect = {
                index: index+1,
                spectacle: pageData(spectacle).text().trim(),
                url: URLBase+pageData(spectacle).attr('href')
            }
            listSpectacles.push(spect);
        });


        const salle = data.find(".salle");
        const salleName = salle.find("a").find("span").text().trim()
        const salleLink = URLBase+salle.find("a").attr("href");

        const ville = data.find(".ville-dpt");
        const villeLink = URLBase+ville.find("a").attr("href");
        let villeName = ville.text().trim();
        villeName = villeName.replace(/\s\s+/g, ' ');   // replace spaces, \n and \t with a single space

        const premiere = data.find(".premiere").find("a").text().trim();


        const dataConcert = {
            date : date,
            time : time,
            textDateTime : fullDateTime,
            ville : villeName,
            villeUrl: villeLink,
            salle : salleName,
            salleUrl : salleLink,
            spectacles : listSpectacles
        }

        // not all concerts have a premiere
        if (premiere !== (undefined || '')) dataConcert.premiere = premiere;


        dataConcerts.push(dataConcert);

    });


    // writing the data in JSON file
    writeInJSONFile(dataConcerts);

    // auto write in xlsx file
    writeInExcelFile(dataConcerts);

}


function writeInJSONFile(object) {
    fs.writeFile(`${JSONOutput}`, JSON.stringify(object), (error) => {
        if (error) {console.log(error); return;}
        console.log(`File created: ${JSONOutput}` );
    });
}


function writeInExcelFile(object) {
    // creating new xlsx file
    let file = xlsx.utils.book_new();

    const transformData = (object) => {
        const data = [];

        object.forEach((obj) => {
            const row = {...obj};
            delete row.spectacles;
            delete row.premiere;
            // set to "" for the spectacles list
            row.spectacle = "";
            row.url = "";
            data.push(row);

            obj.spectacles.forEach(spectacle => {
                const rowS = {};
                rowS.spectacle = spectacle.spectacle;
                rowS.url = spectacle.url;
                if (obj.premiere !== '') rowS.premiere = obj.premiere;
                data.push(rowS);
            });

        });
        return data;
    };


    // data formatting : by rows
    const transformedConcerts = transformData(object);


    // creating worksheet
    const worksheet = xlsx.utils.json_to_sheet(transformedConcerts);

    // adding worksheet to file
    xlsx.utils.book_append_sheet(file, worksheet, "Concerts");

    xlsx.writeFile(file, XLSXOutput); // write file


    console.log(`File created: ${XLSXOutput}`);
}



performScraping();
