CREATE TABLE IF NOT EXISTS memberships (
  mid INT PRIMARY KEY,
  mname VARCHAR(50) UNIQUE NOT NULL,
  score INT NOT NULL CHECK (score >= 0)
);

CREATE TABLE IF NOT EXISTS customers (
  uid INT PRIMARY KEY,
  fullname VARCHAR(100) NOT NULL,
  mid INT NOT NULL REFERENCES memberships(mid)
);

INSERT INTO memberships(mid, mname, score) VALUES
  (1, 'BRONZE', 0),
  (2, 'SILVER', 100),
  (3, 'GOLD', 500),
  (4, 'PLATINUM', 1000)
ON CONFLICT (mid) DO UPDATE SET mname = EXCLUDED.mname, score = EXCLUDED.score;
