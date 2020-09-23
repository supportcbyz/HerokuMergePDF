var express = require('express');
const merge = require('easy-pdf-merge');
var download = require('download-pdf')
const fs = require("fs");
const https = require('https');
const request = require("request-promise-native");
const path = require("path")
var app = express();
var jsforce = require('jsforce');
var bodyParser = require('body-parser');
const directoryPath = 'Resources';
var server_port = process.env.YOUR_PORT || process.env.PORT || 80;
app.use(bodyParser.json());


app.get('/', function (req, res) {
res.send('API is working.. Please use /mergepdf endpoint..');
});
app.post('/mergepdf',(req,res)=>{

    //initially remove all files in the directory....
    fs.readdir(directoryPath, (err, files) => {
        if (err) throw err;
      
        for (const file of files) {
          fs.unlink(path.join(directoryPath, file), err => {
            if (err) throw err;
          });
        }
      });

    //console.log('Ids: '+ req.Ids);
    let connectionFn =sfdcConnFn();
    connectionFn.then((data)=>{
        // console.log(data.con);
        console.log('userInfo: '+data.con.userInfo.id);
        console.log('instanceUrl: '+data.con.instanceUrl);
        console.log(req.body);
        console.log(req.body.Ids);
        //console.log('accessToken: '+ data.con.accessToken);
         //get file
         var promisesArr =[];
         req.body.Ids.split(',').forEach((recId)=>{
            fileOut = fs.createWriteStream('Resources/'+recId+'.pdf');
            //console.log(data.con.sobject('Attachment').record(recId));
            console.log('blob: ');
            //console.log( data.con.sobject('Attachment').record(recId).blob('Body'));
            var p = new Promise((resolve, reject) => {
                data.con.sobject('Attachment').record(recId).blob('Body').pipe(fileOut);
                fileOut.on('error',reject);
                fileOut.on('finish',resolve);
            });
            promisesArr.push(p);
            //console.log(blob);
            //.pipe(fileOut);
         })
         console.log('promisesArr');
         console.log(promisesArr);
         Promise.all(promisesArr)
        .then((x) => {
            console.log('promises resolved');
            console.log('file writing completed...'); 
            //reading files    
            // const arrayOfFiles = fs.readdirSync("Resources");
            // console.log(arrayOfFiles);
            // var finalArr =arrayOfFiles.map((x)=>{
            //     if(!(x.startsWith('.'))){
            //         return 'Resources/'+x; 
            //     }
            // });
            // finalArr = finalArr.filter(function( element ) {
            //     return element !== undefined;
            // });
            // console.log(finalArr);
            var finalMergeArr=[];
            var allIds =req.body.Ids.split(',');
            for(var i=0;i < allIds.length;i++){
                var fName = 'Resources/'+allIds[i]+'.pdf';
                finalMergeArr.push(fName);
            }
            console.log(finalMergeArr);
            merge(finalMergeArr, 'Output/final.pdf', function(err) {
                    if(err) {
                    console.log(err);
                    res.send(err);
                    }
                    else{
                        console.log('Successfully merged!');
                        var data =fs.readFileSync('Output/final.pdf');
                        res.contentType("application/pdf");
                        res.send(data);
                    }
                });
        })
        .catch(console.log);

     });

});

app.get('/merge', function (req, res) {

    let connectionFn =sfdcConnFn();
    connectionFn.then((data)=>{
       // console.log(data.con);
       console.log('userInfo: '+data.con.userInfo.id);
       console.log('instanceUrl: '+data.con.instanceUrl);
       //console.log('accessToken: '+ data.con.accessToken);
        //get file
        fileOut = fs.createWriteStream('./test.pdf')
        data.con.sobject('Attachment').record('00P110000070xISEAY').blob('Body').pipe(fileOut);

    });
    //get connected to salesforce.
    //read the files from salesforce attachments.
    //then store them locally, then merge them. 
    var pdf1 = "http://www.africau.edu/images/default/sample.pdf";
    var pdf2 = "https://www.ieee.org/content/dam/ieee-org/ieee/web/org/pubs/ecf_faq.pdf";
var promise1 =downloadPDF(pdf1, "Resources/pdf1.pdf");
var promise2 =downloadPDF(pdf2, "Resources/pdf2.pdf");
Promise.all([promise1, promise2])
.then((values) => {
    console.log(values);
    merge(['Resources/pdf1.pdf', 'Resources/pdf2.pdf'], 'Resources/pdf3.pdf', function(err) {
        if(err) {
        console.log(err);
        res.send(err);
        }
        else{
            console.log('Successfully merged!');
            var data =fs.readFileSync('Resources/pdf3.pdf');
            res.contentType("application/pdf");
            res.send(data);
            //res.send('Hello World!');
            // res.downloadPDF()
            // .sendStatus('200')
            // .json({ 'Success':'true' });
        }
    });
})
.catch((e)=>{
    console.log(e);
res.send('error occured while trying to merger files..');
});
})

async function downloadPDF(pdfURL, outputFilename) 
{
        let pdfBuffer = await request.get({uri: pdfURL, encoding: null});
        console.log("Writing downloaded PDF file to " + outputFilename + "...");
        fs.writeFileSync(outputFilename, pdfBuffer);
}
function toMergePdf(finalArr){
    return new Promise(function(resolve, reject) {
        console.log('merging: ');
        console.log(finalArr);
        console.log('<---------->');
        merge(finalArr, 'Output/final.pdf', function(err) {
            if(err) {
            console.log(err);
            //res.send(err);
            reject(err);
            }
            else{
                console.log('Successfully merged!');
                 resolve('success');
            }
        });
    })
}
function sfdcConnFn(){
    return new Promise(function(resolve, reject) {
        var conn = new jsforce.Connection({
            // you can change loginUrl to connect to sandbox or prerelease env.
            loginUrl : (process.env.url|| 'https://test.salesforce.com')
            });
            conn.login((process.env.username), (process.env.password), function(err, userInfo) {
            if (err) { 
                var resp={
                    con :'error',
                    status:'400'
                };
                reject(resp);
                console.error(err); 
            }
            else{
                //logger.debug(conn.instanceUrl);
                console.log("User ID: " + userInfo.id);
                console.log("Org ID: " + userInfo.organizationId);
                var resp={
                    con :conn,
                    status:'200'
                };
                resolve(resp);
            }//sucess conn else
            });//conn login fn.
    
    })
}
app.listen(process.env.PORT ||3000, function () {
  console.log('Example app listening on port 3000!');
});
