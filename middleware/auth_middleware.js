const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}
