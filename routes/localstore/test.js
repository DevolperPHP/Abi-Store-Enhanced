const { Printer } = require('@node-escpos/core');
const USB = require('@node-escpos/usb-adapter');

const device = new USB(); // auto-detect

device.open((error) => {
  if (error) {
    return console.error('Failed to open printer:', error);
  }

  const printer = new Printer(device, { encoding: "GB18030" });

  printer
    .text('*** Test Print ***')
    .text('Hello from Node.js!\n') // newline with \n
    .text('Line 2\n')
    .cut()
    .close();
});