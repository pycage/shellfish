exports.grey = function (input, output)
{
    for (let i = 0; i < input.length; i += 4)
    {
        const r = input[i];
        const g = input[i + 1];
        const b = input[i + 2];
        const brightness = parseInt(r * 0.2126 + g * 0.7152 + b * 0.0722);
        output[i] = brightness;
        output[i + 1] = brightness;
        output[i + 2] = brightness;
        output[i + 3] = 0xff;
    }
};

exports.convolution = function (width, height, input, output, kernel, offset)
{
    for (let y = 1; y < height - 1; ++y)
    {
        for (let x = 1; x < width - 1; ++x)
        {
            for (let c = 0; c < 3; ++c)
            {
                const i = (y * width + x) * 4 +c;
                output[i] = offset +
                (
                    kernel[0] * input[i - width * 4 - 4] +
                    kernel[1] * input[i - width * 4] +
                    kernel[2] * input[i - width * 4 + 4] +
                    kernel[3] * input[i - 4] +
                    kernel[4] * input[i] +
                    kernel[5] * input[i + 4] +
                    kernel[6] * input[i + width * 4 - 4] +
                    kernel[7] * input[i + width * 4] +
                    kernel[8] * input[i + width * 4 + 4]
                );
            }
            output[(y * width + x) * 4 + 3] = 255;
        }
    }
};
