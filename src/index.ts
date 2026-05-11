import dotenv from 'dotenv'
import connectDB from './db/index.js'
import app from './app.js'

dotenv.config({
    path:'./.env'
})

const startServer = async () => {
    try {
        await connectDB();
        const port = Number(process.env.PORT || 8000);
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        server.on("error", (error: Error) => {
            console.error("Server error:", error);
            process.exit(1);
        });
    } catch (error) {
        console.error("Startup failed:", error);
        process.exit(1);
    }
};

startServer();
