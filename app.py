from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    # O Flask procura automaticamente dentro da pasta /templates
    return render_template('index.html')

if __name__ == '__main__':
    # host 0.0.0.0 é essencial para a VM da Azure aceitar conexões externas
    app.run(host='0.0.0.0', port=5000, debug=False)