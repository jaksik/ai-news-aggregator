import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb'; // Import your Mongoose connection utility
import Article from '../../models/Article';   // Import your Article Mongoose model

type ResponseData = {
  message: string;
  connectionStatus?: string;
  dbName?: string;
  articleCount?: number; // To show a basic interaction with the Article model
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method === 'GET') {
    try {
      console.log('API /api/db-test: Attempting to connect to MongoDB...');
      const mongooseInstance = await dbConnect(); // Call your connection utility
      console.log('API /api/db-test: MongoDB connection apparently successful.');

      // You can get the database name from the connection object
      const dbName = mongooseInstance.connection.db.databaseName;
      console.log(`API /api/db-test: Connected to database: ${dbName}`);

      // Perform a simple operation using your Article model
      // This will also ensure the model is correctly initialized
      console.log('API /api/db-test: Attempting to count documents in Articles collection...');
      const count = await Article.countDocuments();
      console.log(`API /api/db-test: Found ${count} articles.`);

      res.status(200).json({
        message: 'Successfully connected to MongoDB and interacted with the Article model.',
        connectionStatus: 'Connected',
        dbName: dbName,
        articleCount: count,
      });
    } catch (error: any) {
      console.error('API /api/db-test: MongoDB connection or query error:', error);
      res.status(500).json({
        message: 'Failed to connect to MongoDB or perform test query.',
        connectionStatus: 'Failed',
        error: error.message,
        // stack: error.stack, // Optionally include stack for more debug info
      });
    }
  } else {
    // Handle other HTTP methods
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ message: `Method ${req.method} Not Allowed`, error: 'Method Not Allowed' });
  }
}