const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

app.listen(3001, () => {
    console.log('Backend running on port 3001');
});
