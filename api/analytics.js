
module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const expectedKey = process.env.ANALYTICS_API_KEY;
  const email = process.env.USER_EMAIL;

  if (!expectedKey || req.headers["x-api-key"] !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const events = req.body?.events;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: "events must be an array" });
    }

    const users = new Set();
    const totals = new Map();
    let revenue = 0;

    for (const event of events) {
      users.add(event.user);
      const amount = Number(event.amount);

      if (Number.isFinite(amount) && amount > 0) {
        revenue += amount;
        totals.set(event.user, (totals.get(event.user) || 0) + amount);
      }
    }

    let top_user = null;
    let highest = -Infinity;

    for (const [user, total] of totals) {
      if (total > highest) {
        highest = total;
        top_user = user;
      }
    }

    return res.status(200).json({
      email,
      total_events: events.length,
      unique_users: users.size,
      revenue: Math.round((revenue + Number.EPSILON) * 100) / 100,
      top_user
    });
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }
};
