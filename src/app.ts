import express from 'express';
import cors from 'cors';
// @ts-ignore: cookie-parser does not have local type declarations
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({limit: "16kb"})) //limit the size of the request body
app.use(express.urlencoded({extended: true, limit: "16kb"})) //extended:true means that the urlencoded data will be parsed as a string or array
app.use(express.static("public")) //serve static files from the public directory , also stores the pdf or files in the public directory 
app.use(cookieParser()) //parse cookies from the request

app.get('/test',(req,res)=>{
    res.send("API is working")
})

export default app;