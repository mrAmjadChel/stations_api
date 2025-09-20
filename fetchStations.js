const pool = require("./db");

const normalizeNumber = (val) => {
  
  if (val === undefined || val === null) return null;

  let str = String(val).trim();

  str = str.replace(/,+$/, "");

  const num = parseFloat(str);

  return isNaN(num) ? null : num;
};

async function insertStations() {
  try {
    const res = await fetch(
      "https://data.go.th/dataset/9bccd66e-8b14-414d-93d5-da044569350c/resource/70e1ac97-edfe-4751-8965-6bbe16fb21b4/download/data_station.json"
    );
    const stationsData = await res.json();

    console.log("Start inserting stations from API", stationsData.length);

    for (const s of stationsData) {
      const lat = normalizeNumber(s.lat);
      const lng = normalizeNumber(s.long);

      

      if (lat === null || lng === null) {
        console.warn("skip invalid lat/lng:", s.lat, s.lng);
        continue;
      }

      const comment = s.comment === "NULL" ? null : s.comment;

      try {
        await pool.query(
          `INSERT INTO public.stations (
            station_code, name, en_name, th_short, en_short, chname,
            controldivision, exact_km, exact_distance, km, class,
            lat, lng, active, giveway, dual_track, comment, geom
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
            $12,$13,$14,$15,$16,$17,
            ST_SetSRID(ST_MakePoint($13,$12),4326)::geography
          )
          ON CONFLICT (station_code) DO NOTHING;  
          `,
          [
            s.station_code,
            s.name,
            s.en_name,
            s.th_short,
            s.en_short,
            s.chname,
            s.controldivision,
            s.exact_km,
            s.exact_distance,
            s.km,
            s.class,
            lat,
            lng,
            s.active,
            s.giveway,
            s.dual_track,
            comment,
          ]
        );
      } catch (err) {
        console.error(
          `Error inserting station_code ${s.station_code}:`,
          err.message
        );
      }
    }

    console.log("Finished inserting stations from API");
  } catch (err) {
    console.error("Error fetching or inserting stations:", err.message);
  }
}

module.exports = insertStations;
