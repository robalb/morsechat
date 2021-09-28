FROM python:3.9

WORKDIR /app
copy ./requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt
EXPOSE 5000

ENTRYPOINT ["python3", "main.py"]
