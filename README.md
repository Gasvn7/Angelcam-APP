# Angelcam APP

Developed with React and Django

## Installation

### 1. GitClone the repository

```bash
git clone https://github.com/Gasvn7/Angelcam-APP.git
cd angelcam
```

### 2. Frontend(React)

```bash
cd frontend
npm install # or yarn install
```

### 3. Backend(Django)

```bash
cd backend
python -m venv env
source env/bin/activate # On Windows use: env\Scripts\activate
pip install -r requirements.txt
```

## Running the Application

### 1. Start the Backend Server

```bash
source env/bin/activate # On Windows use: env\Scripts\activate
python manage.py runserver
```

The server will start in `http://127.0.0.1:8000/`

### 2. Start the Frontend Development Server

```bash
npm start # or yarn start
```

The application will start in `http://localhost:3000/`

## Usage

- Navigate to `http://localhost:3000/` in your browser.
- Use your Angelcam Access Token to login. (You can use this: bbb62e2feb932606540dd85af86ee63c5e51ad94")
- Explore the list of shared cameras, view live streams, and play back recordings.
