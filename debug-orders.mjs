import http from "http";

const req = http.request(
  "http://localhost:3001/api/orders?limit=200",
  {
    headers: {
      "x-admin-token": "shopluxadmin"
    }
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log("Status:", res.statusCode);
      const parsed = JSON.parse(data);
      console.log("Total:", parsed.total);
      console.log("Orders count:", parsed.orders?.length);
    });
  }
);

req.on("error", console.error);
req.end();
