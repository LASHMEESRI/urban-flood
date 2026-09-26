from flask import Flask, request, jsonify
from flask_cors import CORS

from predict_lstm import predict

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "model": "LSTM",
        "horizon": "next_hour"
    })


@app.route("/predict", methods=["POST"])
def predict_water_level():
    try:
        data = request.get_json()

        rainfall = data.get("rainfall_sequence")
        water_level = data.get("water_level_sequence")

        if rainfall is None or water_level is None:
            return jsonify({
                "error": "rainfall_sequence and water_level_sequence are required"
            }), 400

        if len(rainfall) != 6:
            return jsonify({
                "error": "rainfall_sequence must contain 6 values"
            }), 400

        if len(water_level) != 6:
            return jsonify({
                "error": "water_level_sequence must contain 6 values"
            }), 400

        predicted_level = predict(
            rainfall,
            water_level
        )

        return jsonify({
            "predicted_water_level_m": round(predicted_level, 4),
            "model": "LSTM",
            "horizon": "next_hour"
        })

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5001,
        debug=False
    )