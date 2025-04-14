import React, { useState } from 'react';
import { TableCell, Typography, Fade, Box } from '@mui/material';

const TableCellWithCopy = ({ text, maxLength = 30 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <TableCell
      onClick={handleCopy}
      sx={{
        cursor: 'pointer',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {text}

      {/* Centered Copied message */}
      <Fade in={copied}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'gray',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            boxShadow: 2,
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 600 }}
          >
            Copied!
          </Typography>
        </Box>
      </Fade>
    </TableCell>
  );
};

export default TableCellWithCopy;

