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


    // EXPOSANTS Scraping

    const dataExposants = [];

    const concerts = pageData(".panel-body");
    concerts.each((index, concert) => {
        const data = pageData(concert);

        const dt = data.find(".date").find("time");
        const date_time = dt.attr("datetime");

        if (date_time === undefined) return;

        const date = date_time.split('T')[0];
        const time = date_time.split('T')[1];

        console.log(index+": "+date + " | "+time)

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
                name: pageData(spectacle).text().trim(),
                link: URLBase+pageData(spectacle).attr('href')
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
            spectacles : spectacles
        }

        if (premiere !== (undefined || '')) dataConcert.premiere = premiere;




        // dataExposants.push(dataExposant);
    });


    // // writing the data in JSON file
    // writeInJSONFile(objectData);

    // // creating new xlsx file
    // let file = xlsx.utils.book_new();

    // // auto write in xlsx file : different sheets for Exposants and Sponsors
    // writeInExcelFile(objectData, file, XLSXOutput);


}


function writeInJSONFile(object) {
    fs.writeFile(`${JSONOutput}`, JSON.stringify(object), (error) => {
        if (error) {console.log(error); return;}
        console.log(`File created: ${JSONOutput}` );
    });
}


function writeInExcelFile(object, file, name) {

    const transformData = (object) => {
        const data = [];

        object.forEach((obj) => {
            const name = Object.keys(obj)[0];
            const details = obj[name];

            const row = { name, ...details }; 
            data.push(row);
        });
        return data;
    };


    // data formatting : by rows
    const transformedExposants = transformData(object.exposants);
    const transformedSponsors  = transformData(object.sponsors);

    // creating worksheet
    const worksheet1 = xlsx.utils.json_to_sheet(transformedExposants);
    // adding worksheet to file
    xlsx.utils.book_append_sheet(file, worksheet1, "Exposants");

    const worksheet2 = xlsx.utils.json_to_sheet(transformedSponsors);
    xlsx.utils.book_append_sheet(file, worksheet2, "Sponsors")

    xlsx.writeFile(file, name); // write file


    console.log(`File created: ${XLSXOutput}`);
}



performScraping();
