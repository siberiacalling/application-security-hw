<!DOCTYPE html>
<html>
<body>

<h1><b>Docker commands:</b></h1>
<p>docker build -t container-name . </p>
<p>docker run -p 8080:8080 -t container-name</p>
<p>Stop or delete container:</p>
<p>>docker stop $(docker ps -a -q)</p>
<p>docker rm $(docker ps -a -q -f status=exited)</p>
</body>
</html>
