from app.infer import predict_image
import sys
print(predict_image(sys.argv[1] if len(sys.argv)>1 else "sample.jpg"))
