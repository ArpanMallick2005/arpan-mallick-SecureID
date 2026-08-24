const mongoose = require('mongoose');
const uri = "mongodb+srv://mallickarpan53_db_user:ArpanMallick@cluster0.oz2z2zq.mongodb.net/iam_demo?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("SUCCESS!");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAIL:", err.message);
    process.exit(1);
  });
