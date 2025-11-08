import dotenv from 'dotenv'
import connectDB from './db/index.js'
import app from './app.js'

dotenv.config({
    path:'./.env'
})

connectDB()
.then(() => {
    const server = app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`)
    })
    server.on("error", (error: Error) => {
        console.log("Error:", error);
        throw error
    })
})
.catch((err) => {
    console.log("Mongo db connection failed !!! ", err);
})