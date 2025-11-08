/*
  # Add Comprehensive University Database

  1. Overview
    - Adds a comprehensive list of major universities worldwide
    - Includes universities from US, UK, Europe, Asia, Australia, and Canada
    - Each university has name, domain, location information

  2. Data Added
    - 50+ major universities across the globe
    - Organized by region for better coverage
    - Includes email domains for verification

  3. Notes
    - Uses INSERT with ON CONFLICT DO NOTHING to avoid duplicates
    - Preserves existing university data
*/

-- Insert comprehensive list of universities
INSERT INTO universities (name, domain, location, logo_url) VALUES
  -- United States
  ('Harvard University', 'harvard.edu', 'Cambridge, MA', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Yale University', 'yale.edu', 'New Haven, CT', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Princeton University', 'princeton.edu', 'Princeton, NJ', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Columbia University', 'columbia.edu', 'New York, NY', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Pennsylvania', 'upenn.edu', 'Philadelphia, PA', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Cornell University', 'cornell.edu', 'Ithaca, NY', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Brown University', 'brown.edu', 'Providence, RI', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Dartmouth College', 'dartmouth.edu', 'Hanover, NH', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Duke University', 'duke.edu', 'Durham, NC', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Northwestern University', 'northwestern.edu', 'Evanston, IL', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Johns Hopkins University', 'jhu.edu', 'Baltimore, MD', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Chicago', 'uchicago.edu', 'Chicago, IL', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('California Institute of Technology', 'caltech.edu', 'Pasadena, CA', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of California, Berkeley', 'berkeley.edu', 'Berkeley, CA', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of California, Los Angeles', 'ucla.edu', 'Los Angeles, CA', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Southern California', 'usc.edu', 'Los Angeles, CA', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('New York University', 'nyu.edu', 'New York, NY', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Michigan', 'umich.edu', 'Ann Arbor, MI', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Texas at Austin', 'utexas.edu', 'Austin, TX', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Washington', 'uw.edu', 'Seattle, WA', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Georgia Institute of Technology', 'gatech.edu', 'Atlanta, GA', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Carnegie Mellon University', 'cmu.edu', 'Pittsburgh, PA', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Boston University', 'bu.edu', 'Boston, MA', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  
  -- United Kingdom
  ('University of Cambridge', 'cam.ac.uk', 'Cambridge, UK', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Imperial College London', 'imperial.ac.uk', 'London, UK', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University College London', 'ucl.ac.uk', 'London, UK', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('London School of Economics', 'lse.ac.uk', 'London, UK', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Edinburgh', 'ed.ac.uk', 'Edinburgh, UK', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('King''s College London', 'kcl.ac.uk', 'London, UK', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Manchester', 'manchester.ac.uk', 'Manchester, UK', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Warwick', 'warwick.ac.uk', 'Coventry, UK', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Bristol', 'bristol.ac.uk', 'Bristol, UK', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  
  -- Canada
  ('University of Toronto', 'utoronto.ca', 'Toronto, Canada', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('McGill University', 'mcgill.ca', 'Montreal, Canada', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of British Columbia', 'ubc.ca', 'Vancouver, Canada', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Alberta', 'ualberta.ca', 'Edmonton, Canada', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Waterloo', 'uwaterloo.ca', 'Waterloo, Canada', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  
  -- Europe
  ('ETH Zurich', 'ethz.ch', 'Zurich, Switzerland', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('École Polytechnique', 'polytechnique.edu', 'Palaiseau, France', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Sorbonne University', 'sorbonne-universite.fr', 'Paris, France', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Technical University of Munich', 'tum.de', 'Munich, Germany', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Ludwig Maximilian University', 'lmu.de', 'Munich, Germany', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Amsterdam', 'uva.nl', 'Amsterdam, Netherlands', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Delft University of Technology', 'tudelft.nl', 'Delft, Netherlands', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('KU Leuven', 'kuleuven.be', 'Leuven, Belgium', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  
  -- Asia
  ('National University of Singapore', 'nus.edu.sg', 'Singapore', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Nanyang Technological University', 'ntu.edu.sg', 'Singapore', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Tsinghua University', 'tsinghua.edu.cn', 'Beijing, China', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Peking University', 'pku.edu.cn', 'Beijing, China', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Tokyo', 'u-tokyo.ac.jp', 'Tokyo, Japan', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Seoul National University', 'snu.ac.kr', 'Seoul, South Korea', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Hong Kong University', 'hku.hk', 'Hong Kong', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('Indian Institute of Technology Delhi', 'iitd.ac.in', 'New Delhi, India', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  
  -- Australia
  ('Australian National University', 'anu.edu.au', 'Canberra, Australia', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Melbourne', 'unimelb.edu.au', 'Melbourne, Australia', 'https://images.pexels.com/photos/207691/pexels-photo-207691.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Sydney', 'sydney.edu.au', 'Sydney, Australia', 'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=100'),
  ('University of Queensland', 'uq.edu.au', 'Brisbane, Australia', 'https://images.pexels.com/photos/256490/pexels-photo-256490.jpeg?auto=compress&cs=tinysrgb&w=100')

ON CONFLICT (domain) DO NOTHING;
