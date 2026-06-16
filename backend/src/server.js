require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 YCYW Meeting API ready at http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Storage: ${process.env.USE_OSS === 'true' ? 'Aliyun OSS' : 'Local disk'}`);
  console.log(`   DB: ${process.env.DATABASE_URL || '(unset)'}\n`);
});
