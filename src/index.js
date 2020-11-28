const express = require('express')
require('./db/mongoose')
const connectDB = require('./db/mongoose')
const dotenv = require('dotenv')
dotenv.config({path: "./config/dev.env"})

const path = require('path')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const mongoose = require('mongoose')
const GridFsStorage = require ('multer-gridfs-storage')
const Grid = require ('gridfs-stream')
const methodOveride = require('method-override')


const app = express()
connectDB()
const port = process.env.PORT || 5000

app.use(bodyParser.json())
app.use(methodOveride('_method'))
app.set('view engine', 'ejs')

const conn = mongoose.createConnection(process.env.MONGODB_URL);

let gfs;

conn.once('open',  () => {
    //init stream
    gfs = Grid(conn.db, mongoose.mongo)
    gfs.collection('File-Uploads')
})

//Storage object

const storage = new GridFsStorage({
    url: process.env.MONGODB_URL,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'File-Uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });

const upload = multer({ storage });

//loads form
//GET form
app.get('/', (req, res) => {
    gfs.files.find().toArray((error, files) => {
        //if file exist
        if(!files || files.length === 0) {
            res.render('index', {files: false})
        }else{
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png'){
                    file.isImage = true
                }else{
                    file.isImage = false
                }
            })
            res.render('index', {files: files})
        }
    })
})

//@post
//upload file to db
app.post('/upload', upload.single('file'), (req, res) => {
    res.redirect('/')
    res.send()
})

//@route GET/file
app.get('/files', (req, res) => {
    gfs.files.find().toArray((error, files) => {
        //if file exist
        if(!files || files.length === 0) {
            return res.status(404).json({
                error: 'File does not exist'
            })
        }else{
            return res.json(files)
        }
    })
})


//@route GET/file/:filename
//GET file by file name
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (error, file) => {

        if(!file || file.length === 0) {
            return res.status(404).json({
                error: 'File could not be found. Please enter valid file name.'
            })
        }else{
            res.json(file)
        }

    })

})  

//@GET /image/:filename

app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (error, file) => {

        if(!file || file.length === 0) {
            return res.status(404).json({
                error: 'File could not be found. Please enter valid file name.'
            })
        }
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            const readstream = gfs.createReadStream(file.filename)
            readstream.pipe(res)
        } else{
            res.status(404).json({
                error:'File does not exist. Please enter valid file id.'
            })
        }
    })

})  



// app.use(express.json())
// app.use(userRouter)

app.listen(port, () => {
    console.log('Wakey Wakey kk, Server is running on '+ port)
})