import mongoose from 'mongoose'

const DB_NAME = process.env.DB_NAME as string

const connectDB = async ()=>{
    try {
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URL}`)
        console.log(`\n MongoDB connect !! DB HOST: ${connectionInstance.connection.host}`)
    }
    catch (error){
        console.log("Mongoose connection FAILED:", error);
        process.exit(1);
    }
}

export default connectDB;