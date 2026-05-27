$json = '{"admin1":{"id":"admin1","username":"admin1","password":"admin1234","role":"superadmin","full_name":"admin1"}}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$url = 'https://timetable-ats-default-rtdb.firebaseio.com/data/users.json'
$req = [System.Net.HttpWebRequest]::Create($url)
$req.Method = 'PUT'
$req.ContentType = 'application/json'
$req.ContentLength = $bytes.Length
$stream = $req.GetRequestStream()
$stream.Write($bytes, 0, $bytes.Length)
$stream.Close()
$resp = $req.GetResponse()
Write-Host "Status: $($resp.StatusCode)"
$resp.Close()
