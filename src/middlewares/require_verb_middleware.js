export function requireVerbMiddleware(requiredVerb) {
    return (req, res, next) => {
        const isValideVerb = req.verb == requiredVerb;
        if (!isValideVerb) {
            return res.status(401).json({ error: `Event t tag must be ${requiredVerb}` });
        }
        next();
    }
}